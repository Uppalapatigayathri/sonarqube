/*
 * SonarQube
 * Copyright (C) 2009-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { mockLoggedInUser } from '../../../helpers/testMocks';
import { ComponentQualifier } from '../../../types/component';
import { IssueType } from '../../../types/issues';
import { NoticeType } from '../../../types/users';
import {
  branchHandler,
  componentsHandler,
  issuesHandler,
  renderIssueApp,
  renderProjectIssuesApp,
  ui,
} from '../test-utils';

jest.mock('../sidebar/Sidebar', () => {
  const fakeSidebar = () => {
    return <div data-guiding-id="issue-5" />;
  };
  return {
    __esModule: true,
    default: fakeSidebar,
    Sidebar: fakeSidebar,
  };
});

beforeEach(() => {
  issuesHandler.reset();
  componentsHandler.reset();
  branchHandler.reset();
  window.scrollTo = jest.fn();
  window.HTMLElement.prototype.scrollTo = jest.fn();
});

describe('issues app', () => {
  describe('rendering', () => {
    it('should show warning when not all issues are accessible', async () => {
      const user = userEvent.setup();
      renderProjectIssuesApp('project/issues?id=myproject', {
        canBrowseAllChildProjects: false,
        qualifier: ComponentQualifier.Portfolio,
      });
      expect(screen.getByText('issues.not_all_issue_show')).toBeInTheDocument();

      await act(async () => {
        await user.keyboard('{ArrowRight}');
      });

      expect(screen.getByText('issues.not_all_issue_show')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should handle keyboard navigation in list and open / close issues', async () => {
      const user = userEvent.setup();
      renderIssueApp();

      // Navigate to 2nd issue
      await act(async () => {
        await user.keyboard('{ArrowDown}');
      });

      // Select it
      await act(async () => {
        await user.keyboard('{ArrowRight}');
      });
      expect(
        screen.getByRole('heading', { name: issuesHandler.list[1].issue.message }),
      ).toBeInTheDocument();

      // Go back
      await act(async () => {
        await user.keyboard('{ArrowLeft}');
      });
      expect(
        screen.queryByRole('heading', { name: issuesHandler.list[1].issue.message }),
      ).not.toBeInTheDocument();

      // Navigate to 1st issue and select it
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowUp}');
      await act(async () => {
        await user.keyboard('{ArrowRight}');
      });
      expect(
        screen.getByRole('heading', { name: issuesHandler.list[0].issue.message }),
      ).toBeInTheDocument();
    });

    it('should open issue and navigate', async () => {
      const user = userEvent.setup();
      renderIssueApp();

      // Select an issue with an advanced rule
      await act(async () => {
        await user.click(await screen.findByRole('link', { name: 'Fix that' }));
      });
      expect(screen.getByRole('tab', { name: 'issue.tabs.code' })).toBeInTheDocument();

      // Are rule headers present?
      expect(screen.getByRole('heading', { level: 1, name: 'Fix that' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'advancedRuleId' })).toBeInTheDocument();

      // Select the "why is this an issue" tab and check its content
      await act(async () => {
        await user.click(
          screen.getByRole('tab', { name: `coding_rules.description_section.title.root_cause` }),
        );
      });
      expect(screen.getByRole('heading', { name: 'Because' })).toBeInTheDocument();

      // Select the "how to fix it" tab
      await act(async () => {
        await user.click(
          screen.getByRole('tab', { name: `coding_rules.description_section.title.how_to_fix` }),
        );
      });

      // Is the context selector present with the expected values and default selection?
      expect(screen.getByRole('radio', { name: 'Context 2' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Context 3' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Spring' })).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: 'coding_rules.description_context.other' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Spring', current: true })).toBeInTheDocument();

      // Select context 2 and check tab content
      await act(async () => {
        await user.click(screen.getByRole('radio', { name: 'Context 2' }));
      });
      expect(screen.getByText('Context 2 content')).toBeInTheDocument();

      // Select the "other" context and check tab content
      await act(async () => {
        await user.click(
          screen.getByRole('radio', { name: 'coding_rules.description_context.other' }),
        );
      });
      expect(screen.getByText('coding_rules.context.others.title')).toBeInTheDocument();
      expect(screen.getByText('coding_rules.context.others.description.first')).toBeInTheDocument();
      expect(
        screen.getByText('coding_rules.context.others.description.second'),
      ).toBeInTheDocument();

      // Select the main info tab and check its content
      await act(async () => {
        await user.click(
          screen.getByRole('tab', { name: `coding_rules.description_section.title.more_info` }),
        );
      });
      expect(screen.getByRole('heading', { name: 'Link' })).toBeInTheDocument();

      // Check for extended description (eslint FP)
      // eslint-disable-next-line jest-dom/prefer-in-document
      expect(screen.getAllByText('Extended Description')).toHaveLength(1);

      // Select the previous issue (with a simple rule) through keyboard shortcut
      await act(async () => {
        await user.keyboard('{ArrowUp}');
      });

      // Are rule headers present?
      expect(screen.getByRole('heading', { level: 1, name: 'Fix this' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'simpleRuleId' })).toBeInTheDocument();

      // Select the "why is this an issue tab" and check its content
      await act(async () => {
        await user.click(
          screen.getByRole('tab', { name: `coding_rules.description_section.title.root_cause` }),
        );
      });
      expect(screen.getByRole('heading', { name: 'Default' })).toBeInTheDocument();

      // Select the previous issue (with a simple rule) through keyboard shortcut
      await act(async () => {
        await user.keyboard('{ArrowUp}');
      });

      // Are rule headers present?
      expect(screen.getByRole('heading', { level: 1, name: 'Issue on file' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'simpleRuleId' })).toBeInTheDocument();

      // The "Where is the issue" tab should be selected by default. Check its content
      expect(screen.getAllByRole('button', { name: 'Issue on file', exact: false })).toHaveLength(
        2,
      ); // there will be 2 buttons one in concise issue and other in code viewer
      expect(
        screen.getByRole('row', {
          name: '2 * SonarQube',
        }),
      ).toBeInTheDocument();
    });

    it('should be able to navigate to other issue located in the same file', async () => {
      const user = userEvent.setup();
      renderIssueApp();

      await act(async () => {
        await user.click(await ui.issueItemAction5.find());
      });
      expect(ui.projectIssueItem6.getAll()).toHaveLength(2); // there will be 2 buttons one in concise issue and other in code viewer

      await act(async () => {
        await user.click(ui.projectIssueItem6.getAll()[1]);
      });
      expect(screen.getByRole('heading', { level: 1, name: 'Second issue' })).toBeInTheDocument();
    });

    it('should be able to show more issues', async () => {
      const user = userEvent.setup();
      renderIssueApp();

      expect(await ui.issueItems.findAll()).toHaveLength(7);
      expect(ui.issueItem8.query()).not.toBeInTheDocument();

      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'show_more' }));
      });

      expect(ui.issueItems.getAll()).toHaveLength(10);
      expect(ui.issueItem8.get()).toBeInTheDocument();
    });

    // Improve this to include all the bulk change fonctionality
    it('should be able to bulk change', async () => {
      jest.useRealTimers();
      const user = userEvent.setup();
      const currentUser = mockLoggedInUser({
        dismissedNotices: { [NoticeType.ISSUE_GUIDE]: true },
      });
      issuesHandler.setIsAdmin(true);
      issuesHandler.setCurrentUser(currentUser);
      renderIssueApp(currentUser);

      // Check that the bulk button has correct behavior
      expect(screen.getByRole('button', { name: 'bulk_change' })).toBeDisabled();

      await act(async () => {
        await user.click(screen.getByRole('checkbox', { name: 'issues.select_all_issues' }));
      });

      expect(
        screen.getByRole('button', { name: 'issues.bulk_change_X_issues.10' }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'issues.bulk_change_X_issues.10' }));
      await user.click(screen.getByRole('button', { name: 'cancel' }));
      expect(screen.getByRole('button', { name: 'issues.bulk_change_X_issues.10' })).toHaveFocus();
      await user.click(screen.getByRole('checkbox', { name: 'issues.select_all_issues' }));

      // Check that we bulk change the selected issue
      const issueBoxFixThat = within(screen.getByRole('region', { name: 'Fix that' }));

      await user.click(
        screen.getByRole('checkbox', { name: 'issues.action_select.label.Fix that' }),
      );
      await user.click(screen.getByRole('button', { name: 'issues.bulk_change_X_issues.1' }));

      await user.click(screen.getByRole('textbox', { name: /issue.comment.formlink/ }));
      await user.keyboard('New Comment');
      expect(screen.getByRole('button', { name: 'apply' })).toBeDisabled();

      await user.click(screen.getByRole('radio', { name: 'issue.transition.falsepositive' }));
      await user.click(screen.getByRole('button', { name: 'apply' }));

      expect(
        issueBoxFixThat.queryByLabelText(
          'issue.transition.status_x_click_to_change.issue.status.falsepositive',
        ),
      ).not.toBeInTheDocument();
    });
  });
});

describe('redirects', () => {
  it('should work for hotspots', () => {
    renderProjectIssuesApp(`project/issues?types=${IssueType.SecurityHotspot}`);

    expect(screen.getByText('/security_hotspots?assignedToMe=false')).toBeInTheDocument();
  });
});
